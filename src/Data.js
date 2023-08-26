const prisma = require("./prisma");

prisma.$connect();

/**
 * Data
 */

// Data handler
class Data {
  static defaultUserData = {
    name: "Anonymous",
    color: "#777"
  };

  // ANCHOR User CRUD

  static async createUser(user) {
    await prisma.user.create({
      data: {
        id: user._id,
        name: user.name,
        color: user.color || "#777",
        flags: user.flags || {},
        location: user.location
      }
    });
  }

  static async getUser(_id) {
    const user = await prisma.user.findUnique({
      where: {
        id: _id
      }
    });

    return user;
  }

  static async updateUser(_id, user) {
    await prisma.user.update({
      where: {
        id: _id
      },
      data: {
        id: user._id,
        name: user.name,
        color: user.color,
        flags: user.flags
      }
    });
  }

  static async deleteUser(_id) {
    await prisma.user.delete({
      where: {
        id: _id
      }
    });
  }

  // ANCHOR Fish sack CRUD

  static async createSack(sack) {
    await prisma.sack.create({
      data: {
        id: sack.id,
        userId: sack.userId
      }
    });
  }

  static async getSack(sackId) {
    const sack = await prisma.sack.findUnique({
      where: {
        id: sackId
      }
    });

    return sack;
  }

  static async getSackByUserId(userId) {
    const sack = await prisma.sack.findUnique({
      where: { userId }
    });

    return sack;
  }

  static async updateSack(sack) {
    await prisma.sack.update({
      where: {
        id: sack.id
      },
      data: sack
    });
  }

  static async deleteSack(sackId) {
    await prisma.sack.delete({
      where: {
        id: sackId
      }
    });
  }

  // ANCHOR Key/value

  static async get(key) {
    const value = await prisma.kVStore.get({
      where: { key }
    });

    return value;
  }

  static async set(key, value) {
    await prisma.kVStore.update({
      where: { id: key },
      data: value
    });
  }
}

module.exports = {
  Data
};
