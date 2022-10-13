import axios from "axios";
import { Exception, ExceptionType } from "../models/exception.model";
import { LookupParameter } from "../schemas/lookupParameter.schema";
import {
  SubscriberDetail,
  subscriberDetailsSchema,
} from "../schemas/subscriberDetails.schema";
import { getConfig } from "./config.utils";
import { LookupCache } from "./cache/lookup.cache.utils";

export function combineURLs(baseURL: string, relativeURL: string) {
  return relativeURL
    ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "")
    : baseURL;
}

export const registryLookup = async (lookupParameter: LookupParameter) => {
  try {
    console.log('REACHED REGISTRY LOOKUP')
    console.log(lookupParameter)
    const lookupCache = LookupCache.getInstance();
    const cachedResponse = await lookupCache.check(lookupParameter);
    if (cachedResponse) {
        console.log(cachedResponse)
      return cachedResponse;
    }

    console.log("\nLooking Up in registry...!\n");
    const response = await axios.post(
      combineURLs(getConfig().app.registryUrl, "/lookup"),
      lookupParameter
    );
    console.log(response)
    const subscribers: Array<SubscriberDetail> = [];
    response.data.forEach((data: object) => {
      try {
        const subscriberData = subscriberDetailsSchema.parse(data);
        subscribers.push(subscriberData);
      } catch (error) {
        // console.log(data);
        // console.log(error);
      }
    });

    lookupCache.cache(lookupParameter, subscribers);
    return subscribers;
  } catch (error: any) {
    if (error instanceof Exception) {
      throw error;
    }

    throw new Exception(
      ExceptionType.Registry_LookupError,
      "Error in registry lookup",
      500,
      error
    );
  }
};

export async function getSubscriberDetails(
  subscriber_id: string,
  unique_key_id: string
) {
  try {
    console.log("START: getSubscriberDetails -----------------------------------------")
    const subsribers = await registryLookup({
      subscriber_id: subscriber_id,
      unique_key_id: unique_key_id,
    });
    console.log("SUBSCRIBERS: ", subsribers)
    if (subsribers.length == 0) {
      throw new Exception(
        ExceptionType.Registry_NoSubscriberFound,
        "No subscriber found",
        404
      );
    }
    console.log("END: getSubscriberDetails -----------------------------------------")
    return subsribers[0];
  } catch (error: any) {
    if (error instanceof Exception) {
      throw error;
    }

    throw new Exception(
      ExceptionType.Registry_LookupError,
      "Error in registry lookup",
      500,
      error
    );
  }
}
