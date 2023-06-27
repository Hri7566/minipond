require("dotenv").config();
const { createEnv } = require("@t3-oss/env-core");
const { z } = require("zod");

module.exports = {
  env: createEnv({
    client: "",
    clientPrefix: "",
    isServer: true,
    server: {
      PORT: z.string(),
      SALT: z.string(),
    },
    runtimeEnv: process.env,
  }),
};
