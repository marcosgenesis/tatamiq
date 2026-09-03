import { createAppDoSenseiClient } from "@appdosensei/contracts/client";

import { API_URL } from "./lib/config";

export const api = createAppDoSenseiClient(API_URL);
