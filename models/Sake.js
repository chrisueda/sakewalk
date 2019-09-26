const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const sakeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: "Please enter a sake name"
    },
    slug: String,
    description: {
      type: String,
      trim: true
    },
    mainCategory: String,
    secondaryCategory: String,
    photo: String
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

sakeSchema.pre("save", async function(next) {
  if (!this.isModified("name")) {
    next();
    return;
  }
  this.slug = slug(this.name);

  // find other sakes that have the same name/slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, "i");

  const sakesWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (sakesWithSlug.length) {
    this.slug = `${this.slug}-${sakesWithSlug.length + 1}`;
  }

  next();
});

sakeSchema.statics.getTagsList = function() {
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

sakeSchema.statics.getTopSakes = function() {
  return this.aggregate([
    // Look up sakes and populate their reviews. 'reviews' comes from
    // mongo db Review model. It lowerscases it and adds an s.
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "sake",
        as: "reviews"
      }
    },
    // filter for only items that have 2 or more reviews
    {
      $match: {
        "reviews.1": { $exists: true }
      }
    },
    // Add the average reviews fields
    {
      $project: {
        photo: "$$ROOT.photo",
        name: "$$ROOT.name",
        reviews: "$$ROOT.reviews",
        slug: "$$ROOT.slug",
        averageRating: { $avg: "$reviews.rating" }
      }
    },
    // Sort it by our new field, highest reviews first
    {
      $sort: { averageRating: -1 }
    },
    // limit to at most 10
    {
      $limit: 10
    }
  ]);
};

// find reviews where the sakes _id property === reviews sake property.
sakeSchema.virtual("reviews", {
  ref: "Review", // what model to linmk
  localField: "_id", // which field on the store
  foreignField: "sake" // which field on the review?
});

function autopopulate(next) {
  this.populate("reviews");
  next();
}

sakeSchema.pre("find", autopopulate);
sakeSchema.pre("findOne", autopopulate);

module.exports = mongoose.model("Sake", sakeSchema);
