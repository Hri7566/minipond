# minipond

I tried making this a massive node app called [fishy-pond](https://github.com/Hri7566/fishy-pond) just to shoot myself in the foot and end up going basic... so this is `minipond`.

This is a little webapp based on something I thought was really fun.

## What does it do?

Essentially, there's a fishing bot that gives fish that can change your color. There's not much progression.

A lot of this code is based off of things I remember from [Multiplayer Piano](https://mppclone.com) since that is where I learned to use WebSockets best.

## How to run

This is a simple node app. My package manager of choice is [pnpm](https://pnpm.io/).

1. Copy the `.env.template` file to `.env` and change the values to your liking.
2. Install dependencies

```sh
pnpm i
```

3. Setup prisma

```sh
pnpm prisma db push
pnpm prisma generate
```

4. Start

```sh
pnpm start
```
