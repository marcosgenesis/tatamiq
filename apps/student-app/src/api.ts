import { createTatamiqClient } from "@tatamiq/contracts/client";

import { API_URL } from "./lib/config";

export const api = createTatamiqClient(API_URL);
