const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
const slug = require("slugs");

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: "Please enter a location name!"
  },
  slug: String,
  description: {
    type: String,
    trim: true
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now
  },
  location: {
    type: {
      type: String,
      default: "Point"
    },
    coordinates: [
      {
        type: Number,
        required: "You must supply coordinates!"
      }
    ],
    address: {
      type: String,
      required: "You must supply an address!"
    }
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: "You must supply an author"
  }
});

// index fields
locationSchema.index({
  name: "text",
  description: "text"
});

locationSchema.index({
  location: "2dsphere"
});

// Use reg function because we need access to 'this'
// This will create a slug on the fly.
locationSchema.pre("save", async function(next) {
  // only do it if it's modified.
  if (!this.isModified("name")) {
    next();
    return;
  }
  this.slug = slug(this.name);
  // find other locations that have the same slug
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)`, "i");

  // this.constructor will be the Location
  const locationsWithSlug = await this.constructor.find({ slug: slugRegEx });
  if (locationsWithSlug.length) {
    this.slug = `${this.slug}-${locationsWithSlug.length + 1}`;
  }

  next();
});

// Custom function that needs reg function because of 'this'
locationSchema.statics.getTagsList = function() {
  // see mongo db aggregate operators
  return this.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
};

module.exports = mongoose.model("Location", locationSchema);
