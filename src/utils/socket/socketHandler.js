const { Server } = require("socket.io");
const ChatMessage = require("../../modules/chat/chat.model");
const User = require("../../modules/user/user.model");
const Follow = require("../../modules/follow/follow.model");
const jwt = require("jsonwebtoken");

//setting up socket handler
const setupSocketHandlers = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.WEB_HOST,
      methods: ["Get", "POST"],
    },
  });

  const onlineUsers = new Map();

  //socket connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        throw new Error("Authentication token is missing!");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      //Get full user details
      const user = await User.findById(decoded._id)
        .select("_id email name picture")
        .lean();

      if (!user) {
        throw new Error("User not found");
      }

      socket.user = user;

      next();
    } catch (error) {
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`user connected: ${socket.user.email}`);
    onlineUsers.set(socket.user.email, socket.id);

    //Handle private message
    socket.on("private_message", async (data) => {
      try {
        const { receiver, message } = data;

        //check if user follows each other
        const [followA, followB] = await Promise.all([
          Follow.findOne({
            "follower.email": socket.user.email,
            "following.email": receiver.email,
          }),
          Follow.findOne({
            "follower.email": receiver.email,
            "following.email": socket.user.email,
          }),
        ]);

        if (!followA || followB) {
          socket.emit("error", {
            message:
              "You can only chat with users who follow you and whom you follow back",
          });
          return;
        }

        const receiverSocketId = onlineUsers.get(receiver.email);

        const newMessage = new ChatMessage({
          sender: {
            _id: socket.user.id,
            email: socket.user.email,
            name: socket.user.name,
            picture: socket.user.picture,
          },
          receiver: {
            _id: socket.user.id,
            email: socket.user.email,
            name: socket.user.name,
            picture: socket.user.picture,
          },
          message,
          read: false,
        });

        await newMessage.save();

        //send to receiver
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("new_message", newMessage);
        }

        //send confirmation to sender
        socket.emit("message_sent", newMessage);
      } catch (error) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle message read status
    socket.on("mark_read", async (data) => {
      try {
        const { messageId } = data;
        const message = await ChatMessage.findByIdAndUpdate(
          messageId,
          {
            read: true,
            readAt: new Date(),
          },
          {
            new: true,
          }
        );

        if (message) {
          const senderSocketId = onlineUsers.get(message.sender.email);
          if (senderSocketId) {
            io.to(senderSocketId).emit("message_read", { messageId });
          }
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to mark message as read" });
      }
    });

    //Handle typing status
    socket.on("typing", async (data) => {
      try {
        const { receiver } = data;

        //check if user follow each other
        const [followA, followB] = await Promise.all([
          Follow.findOne({
            "follower.email": socket.user.email,
            "following.email": receiver.email,
          }),
          Follow.findOne({
            "follower.email": receiver.email,
            "following.email": socket.user.email,
          }),
        ]);

        if (!followA || followB) {
          socket.emit("error", {
            message:
              "You can only chat with users who follow you and whom you follow back",
          });
          return;
        }

        const receiverSocketId = onlineUsers.get(receiver.email);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("user_typing", {
            user: socket.user.email,
          });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to send typing status" });
      }
    });

    //Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.email}`);
      onlineUsers.delete(socket.user.email);
      io.emit("user_offline", { email: socket.user.email });
    });
  });

  return io;
};

module.exports = setupSocketHandlers;
