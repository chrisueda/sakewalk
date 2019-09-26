const mongoose = require("mongoose");
const Sake = mongoose.model("Sake");
const User = mongoose.model("User");
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
  console.log(req.file);
  // check if there's a file to resize
  if (!req.file) {
    next();
    return;
  }
  // grab the extension and create uuid
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  console.log(req.body);
  // now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // once written to file system
  next();
};

exports.addSake = (req, res) => {
  res.render("editSake", { title: "Add Sake" });
};

exports.createSake = async (req, res) => {
  const sake = await new Sake(req.body).save();
  req.flash("success", `Successfully Created ${sake.name}`);
  res.redirect(`/sake/${sake.slug}`);
};

exports.getSakes = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;

  const sakesPromise = Sake.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: "desc" });

  const countPromise = Sake.count();
  const [sakes, count] = await Promise.all([sakesPromise, countPromise]);

  const pages = Math.ceil(count / limit);
  if (!sakes.length && skip) {
    req.flash(
      "info",
      `You asked for page ${page}. But that doesnt exist. So I put you on page ${pages}`
    );
    res.redirect(`/sakes/page/${pages}`);
    return;
  }
  res.render("sakes", { title: "Sakes", sakes, page, pages, count });
};

exports.editSake = async (req, res) => {
  const sake = await Sake.findOne({ _id: req.params.id });
  // res.json(sake);
  res.render("editSake", { title: `Edit ${sake.name}`, sake });
};

exports.updateSake = async (req, res) => {
  const sake = await Sake.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // return new store and not the old one
    runValidators: true
  }).exec();

  req.flash(
    "success",
    `Successfully updated <strong>${sake.name}</strong>. <a href="/sakes/${sake.slug}">View Sake</a>`
  );

  res.redirect(`/sakes/${sake._id}/edit`);
};

exports.getSakeBySlug = async (req, res, next) => {
  const sake = await Sake.findOne({ slug: req.params.slug }).populate(
    "author reviews"
  );
  if (!sake) {
    return next();
  }

  res.render("sake", { sake, title: sake.name });
};

exports.getSakesByTag = async (req, res) => {
  const tag = req.params.tag;

  const tagQuery = tag || { $exists: true };
  const tagsPromise = Sake.getTagsList();
  const sakesPromise = Sake.find({ tags: tagQuery });

  // await both the promises
  const [tags, sakes] = await Promise.all([tagsPromise, sakesPromise]);

  res.render("tags", { tags, title: "Tags", tag, sakes });
};

exports.heartSake = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());

  const operator = hearts.includes(req.params.id) ? "$pull" : "$addToSet";
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      [operator]: { hearts: req.params.id }
    },
    { new: true }
  );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const sakes = await Sake.find({
    _id: { $in: req.user.hearts }
  });

  res.render("sakes", { title: "Sakes You've Loved", sakes });
};

exports.getTopSakes = async (req, res) => {
  const sakes = await Sake.getTopSakes();
  res.render("topSakes", { sakes, title: "Top Sakes" });
};
