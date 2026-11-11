const { Router } = require("express");
const router = Router();


const validate = require("../middlewares/validateSchema");
const { CreateClassSchema } = require("../schemas/class.schema");
const { authenticateToken } = require("../middlewares/authenticateToken");
const asyncHandler = require("../middlewares/asyncHandler");
const { getClasses, createClass } = require("../controllers/class.controller");



router.get("/", authenticateToken, asyncHandler(getClasses));
router.post("/", authenticateToken, validate(CreateClassSchema), asyncHandler(createClass))
router.patch("/:id", authenticateToken, async (req, res) => {
    console.log(req.body);
});
module.exports = router;
