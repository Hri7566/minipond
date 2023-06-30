const prisma = require("./prisma");

/**
 * Data
 */

// Data handler
class Data {
  static defaultUserData = {
    name: "Anonymous",
    color: "#777",
  };

  static async createUser(user) {
    await prisma.user.create({
      data: {
        id: user._id,
        name: user.name,
        color: user.color || "#777",
        flags: user.flags || {},
      },
    });
  }

  static async getUser(_id) {
    const user = await prisma.user.findUnique({
      where: {
        id: _id,
      },
    });

    return user;
  }

  static async updateUser(_id, user) {
    await prisma.user.update({
      where: {
        id: _id,
      },
      data: {
        id: user._id,
        name: user.name,
        color: user.color,
        flags: user.flags,
      },
    });
  }

  static async deleteUser(_id) {
    await prisma.user.delete({
      where: {
        id: _id,
      },
    });
  }
}

module.exports = {
  Data,
};
