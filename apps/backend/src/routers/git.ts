import { gitHttp } from "@nonete/api/v1/content/handler"
import { Hono } from "hono"

// Git's smart HTTP protocol for the content repositories the platform hosts
// (`git clone/push <origin>/git/<slug>.git`). Outside oRPC: git speaks its
// own wire format. No authentication, on purpose.
const router = new Hono()

router.all("/git/*", (c) => gitHttp(c.req.raw))

export default router
