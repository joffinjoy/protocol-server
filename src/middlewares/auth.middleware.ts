import { NextFunction, Request, Response } from "express";
import { Locals } from "../interfaces/locals.interface";
import { AppMode } from "../schemas/configs/app.config.schema";
import { NetworkPaticipantType } from "../schemas/subscriberDetails.schema";
import {
  createAuthHeaderConfig,
  getSenderDetails,
  verifyHeader,
} from "../utils/auth.utils";
import { getConfig } from "../utils/config.utils";
import logger from "../utils/logger.utils";
import { getSubscriberDetails } from "../utils/lookup.utils";
const config = require("config");

export const authValidatorMiddleware = async (
  req: Request,
  res: Response<{}, Locals>,
  next: NextFunction
) => {
    console.log("REACHED AUTH VALIDATOR MIDDLEWARE")
    console.log('START: authValidatorMiddleware -----------------------------------------------------')
    console.log("REQUEST HEADERS: ", JSON.stringify(req.headers, null, '\t'))
    console.debug("REQUEST BODY: ", JSON.stringify(req.body, null, '\t'))
  try {
    //console.log("\nNew Request txn_id", req.body?.context?.transaction_id);
    if (req.body?.context?.bap_id) {
      console.log(
        req.body?.context?.transaction_id,
        "Request from",
        req.body?.context?.bpp_id
      );
    }
    const auth_header = req.headers["authorization"] || "";
    const proxy_header = req.headers["proxy-authorization"] || "";
    console.log(req.body?.context?.transaction_id, "headers", req.headers);
    console.log("AUTH HEADER: ", auth_header)
    console.log("PROXY HEADER: ", proxy_header)
    let authVerified = true;
    const isAuthRequired = config.get("app.auth");
    if (isAuthRequired) {
      var verified = await verifyHeader(auth_header, req, res);
      console.log("VERIFIED: ", verified)
      var verified_proxy = proxy_header
        ? await verifyHeader(proxy_header, req, res)
        : true;
        console.log("VERIFIED PROXY: ", verified_proxy)
      /* console.log(
        req.body?.context?.transaction_id,
        "Verification status:",
        verified,
        "Proxy verification:",
        verified_proxy
      ); */
      authVerified = verified && verified_proxy;
    }

    if (authVerified) {
      const senderDetails = await getSenderDetails(auth_header);
      console.log("SENDER DETAILS: ", senderDetails)
      res.locals.sender = senderDetails;
      next();
    } else {
      res.status(401).json({
        message: {
          ack: {
            status: "NACK",
          },
        },
        error: {
          message: "Authentication failed",
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

export async function authBuilderMiddleware(
  req: Request,
  res: Response<{}, Locals>,
  next: NextFunction
) {
  try {
    console.log('START: authBuilderMiddleware -----------------------------------------------------')
    console.log("REQUEST HEADERS: ", JSON.stringify(req.headers, null, '\t'))
    console.debug("REQUEST BODY: ", JSON.stringify(req.body, null, '\t'))
    const axios_config = await createAuthHeaderConfig(req.body);
    console.log("AXIOS CONFIG: ", axios_config)
    req.headers.authorization = axios_config.headers.authorization;
    const senderDetails = await getSubscriberDetails(
      getConfig().app.subscriberId,
      getConfig().app.uniqueKey
    );
    console.log("SENDER DETAILS: ", senderDetails)
    res.locals.sender = senderDetails;
    console.log('END: authBuilderMiddleware -------------------------------------------------')
    next();
  } catch (error) {
    next(error);
  }
}
