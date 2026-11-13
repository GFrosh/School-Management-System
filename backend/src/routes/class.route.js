const { Router } = require("express");
const router = Router();


const validate = require("../middlewares/validateSchema");
const { CreateClassSchema, UpdateClassSchema } = require("../schemas/class.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const requireRoles = require("../middlewares/requireRoles");
const asyncHandler = require("../middlewares/asyncHandler");
const { getClasses, createClass, updateClass } = require("../controllers/class.controller");



router.get("/", authenticateToken, requireRoles("*"), asyncHandler(getClasses));
router.post("/", authenticateToken, requireRoles("admin"), validate(CreateClassSchema), asyncHandler(createClass))
router.patch("/:id", authenticateToken, requireRoles("admin"), validate(UpdateClassSchema), asyncHandler(updateClass));
module.exports = router;
