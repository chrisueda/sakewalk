const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");
const sakeController = require("../controllers/sakeController");
const userController = require("../controllers/userController");
const authController = require("../controllers/authController");
const reviewController = require("../controllers/reviewController");
const { catchErrors } = require("../handlers/errorHandlers");

//router.get("/", catchErrors(locationController.getLocations));
router.get("/", locationController.homePage);
// Location Routes
router.get("/locations", catchErrors(locationController.getLocations));
router.get("/locations/:id/edit", catchErrors(locationController.editLocation));
router.get("/add", authController.isLoggedIn, locationController.addLocation);

router.post(
  "/add",
  locationController.upload,
  catchErrors(locationController.resize),
  catchErrors(locationController.createLocation)
);
router.post(
  "/add/:id",
  locationController.upload,
  catchErrors(locationController.resize),
  catchErrors(locationController.updateLocation)
);

router.get(
  "/location/:slug",
  catchErrors(locationController.getLocationBySlug)
);

// Sake routes
router.get("/sakes", catchErrors(sakeController.getSakes));
router.get("/sake/add", sakeController.addSake);
router.post(
  "/sake/add",
  sakeController.upload,
  catchErrors(sakeController.resize),
  catchErrors(sakeController.createSake)
);
router.post(
  "/sake/add/:id",
  sakeController.upload,
  catchErrors(sakeController.resize),
  catchErrors(sakeController.updateSake)
);

router.get("/sakes/page/:page", catchErrors(sakeController.getSakes));
router.get("/sakes/:id/edit", catchErrors(sakeController.editSake));

router.get("/sake/:slug", catchErrors(sakeController.getSakeBySlug));

router.get("/tags", catchErrors(sakeController.getSakesByTag));
router.get("/tags/:tag", catchErrors(sakeController.getSakesByTag));

// router.get("/tags", catchErrors(locationController.getLocationsByTag));
// router.get("/tags/:tag", catchErrors(locationController.getLocationsByTag));

router.get("/login", userController.loginForm);
router.post("/login", authController.login);

router.get("/register", userController.registerForm);

router.post(
  "/register",
  userController.validateRegister,
  userController.register,
  authController.login
);

router.get("/logout", authController.logout);

router.get("/account", authController.isLoggedIn, userController.account);
router.post("/account", catchErrors(userController.updateAccount));
router.post("/account/forgot", catchErrors(authController.forgot));

router.get("/account/reset/:token", catchErrors(authController.reset));
router.post(
  "/account/reset/:token",
  authController.confirmedPasswords,
  catchErrors(authController.update)
);

router.get("/map", locationController.mapPage);

router.get(
  "/hearts",
  authController.isLoggedIn,
  catchErrors(sakeController.getHearts)
);

router.post(
  "/reviews/:id",
  authController.isLoggedIn,
  catchErrors(reviewController.addReview)
);

router.get("/top", catchErrors(sakeController.getTopSakes));

// API

router.get("/api/search", catchErrors(locationController.searchLocations));

router.get("/api/locations/near", catchErrors(locationController.mapLocations));

// Add hearts to sakes
router.post("/api/sakes/:id/heart", catchErrors(sakeController.heartSake));
module.exports = router;
