import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tenantsRouter from "./tenants";
import usersRouter from "./users";
import geographyRouter from "./geography";
import contactsRouter from "./contacts";
import campaignsRouter from "./campaigns";
import walletRouter from "./wallet";
import smsRouter from "./sms";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tenantsRouter);
router.use(usersRouter);
router.use(geographyRouter);
router.use(contactsRouter);
router.use(campaignsRouter);
router.use(walletRouter);
router.use(smsRouter);
router.use(dashboardRouter);

export default router;
