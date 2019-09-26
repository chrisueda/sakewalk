const mongoose = require("mongoose");
const Location = mongoose.model("Location");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");

// Image upload
const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype isn't allowed" }, false);
    }
  }
};

exports.upload = multer(multerOptions).single("photo");

exports.resize = async (req, res, next) => {
  // check if there's a file to resize
  if (!req.file) {
    next();
    return;
  }
  // grab the extension and create uuid
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once written to file system
  next();
};

exports.homePage = (req, res) => {
  res.render("index");
};

exports.addLocation = (req, res) => {
  res.render("editLocation", { title: "Add Location" });
};

exports.createLocation = async (req, res) => {
  req.body.author = req.user._id;
  const location = await new Location(req.body).save();
  req.flash("success", `Successfully Created ${location.name}`);
  res.redirect(`/location/${location.slug}`);
};

exports.getLocations = async (req, res) => {
  const locations = await Location.find();
  res.render("locations", { title: "Locations", locations });
};

const confirmOwner = (location, user) => {
  if (!location.author.equals(user._id)) {
    throw Error("You must own this store to edit");
  }
};

exports.editLocation = async (req, res) => {
  const location = await Location.findOne({ _id: req.params.id });
  confirmOwner(location, req.user);
  res.render("editLocation", { title: `Edit ${location.name}`, location });
};

exports.updateLocation = async (req, res) => {
  // set the location data to be a point
  req.body.location.type = "Point";
  const location = await Location.findOneAndUpdate(
    { _id: req.params.id },
    req.body,
    {
      new: true, // return new store and not the old one
      runValidators: true
    }
  ).exec();

  req.flash(
    "success",
    `Successfully updated <strong>${location.name}</strong>. <a href="/locations/${location.slug}">View Location</a>`
  );

  res.redirect(`/locations/${location._id}/edit`);
};

exports.getLocationBySlug = async (req, res, next) => {
  const location = await Location.findOne({ slug: req.params.slug }).populate(
    "author"
  );
  if (!location) {
    return next();
  }

  res.render("location", { location, title: location.name });
};

exports.getLocationsByTag = async (req, res) => {
  const tag = req.params.tag;

  // get the tag or any location that has a tag on it
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Location.getTagsList();
  const locationsPromise = Location.find({ tags: tagQuery });

  // await both the promises
  const [tags, locations] = await Promise.all([tagsPromise, locationsPromise]);

  res.render("tags", { tags, title: "Tags", tag, locations });
};

exports.searchLocations = async (req, res) => {
  const locations = await Location.find(
    {
      $text: {
        $search: req.query.q
      }
    },
    {
      score: { $meta: "textScore" }
    }
  )
    .sort({
      score: { $meta: "textScore" }
    })
    .limit(5);
  res.json(locations);
};

exports.mapLocations = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };
  const locations = await Location.find(q)
    .select("slug name description location photo")
    .limit(10);
  res.json(locations);
};

exports.mapPage = (req, res) => {
  res.render("map", { title: "Map" });
};
