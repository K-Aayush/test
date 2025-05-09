const router = require("express").Router();
const { adminMiddleware } = require("../../middlewares/adminMiddleware");
const basicMiddleware = require("../../middlewares/basicMiddleware");
const ShopFile = require("../../utils/fileProcessor/multer.shop");
const {
  ListShop,
  AddShop,
  DeleteShop,
  GetCart,
  AddToCart,
  RemoveFromCart,
  MultipleFiles,
  SingleShop,
  ReStock,
} = require("./shop.methods");

router.get("/list-shops/:page", basicMiddleware, ListShop);
router.get("/get-shop/:id", basicMiddleware, SingleShop);

router.get("/admin-list-shops/:page", adminMiddleware, ListShop);
router.get("/admin-get-shop/:id", adminMiddleware, SingleShop);

router.post(
  "/upload-shop-images",
  adminMiddleware,
  ShopFile.any(),
  MultipleFiles
);
router.post("/delete-shop-images", adminMiddleware, DeleteShop);

router.post("/add-shop", adminMiddleware, AddShop);
router.post("/update-shop/:id", adminMiddleware, ReStock);
router.delete("/delete-shop/:id", adminMiddleware, DeleteShop);

// list carts
router.get("/list-carts", basicMiddleware, GetCart);
router.post("/add-to-cart", basicMiddleware, AddToCart);
router.delete("/delete-cart/:id", basicMiddleware, RemoveFromCart);

module.exports = router;
