import { gql } from "urql";
import { SaleorAsyncWebhook, SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { PaymentGatewayInitializeSessionEventFragment} from "../../../../generated/graphql";
import { saleorApp } from "../../../saleor-app";
import { createClient } from "../../../lib/create-graphq-client";

/**
 * Example payload of the webhook. It will be transformed with graphql-codegen to Typescript type: OrderCreatedWebhookPayloadFragment
 */
const PaymentGatewayInitializeSessionPayload = gql`
  fragment PaymentGatewayInitializeSessionEvent on PaymentGatewayInitializeSession {
  __typename
  recipient {
      id
    privateMetadata {
      key
      value
    }
    metadata {
      key
      value
    }
  }
  data
  amount
  issuingPrincipal {
    ... on Node {
      id
    }
  }
  sourceObject {
    __typename
    ... on Checkout {
      id
      channel {
        id
        slug
      }
      languageCode
      billingAddress {
        country {
          code
        }
      }
      total: totalPrice {
        gross {
         currency,
          amount
        }
      }
    }
    ... on Order {
      id
      channel {
        id
        slug
      }
      languageCodeEnum
      userEmail
      billingAddress {
       country {
          code
        }
      }
      total {
        gross {
        currency
        amount

        }
      }
    }
  }
}

`;

/**
 * Top-level webhook subscription query, that will be attached to the Manifest.
 * Saleor will use it to register webhook.
 */
const PaymentGatewayInitializeSessionGraphqlSubscription = gql`
  # Payload fragment must be included in the root query
  ${PaymentGatewayInitializeSessionPayload}
  subscription PaymentGatewayInitializeSession {
    event {
      ...PaymentGatewayInitializeSessionEvent
    }
  }
`;

/**
 * Create abstract Webhook. It decorates handler and performs security checks under the hood.
 *
 * orderCreatedWebhook.getWebhookManifest() must be called in api/manifest too!
 */

export const PaymentGatewayInitializeWebhook = new SaleorSyncWebhook<PaymentGatewayInitializeSessionEventFragment>({
  name: "PAYMENT GATEWAY INIT",
  webhookPath: "api/webhooks/payment-gateway-initialize-session",
  event: "PAYMENT_GATEWAY_INITIALIZE_SESSION",
  apl: saleorApp.apl,
  query: PaymentGatewayInitializeSessionGraphqlSubscription,
});

/**
 * Export decorated Next.js handler, which adds extra context
 */
export default PaymentGatewayInitializeWebhook.createHandler((req, res, ctx) => {
  const {
    /**
     * Access payload from Saleor - defined above
     */
    payload,
    /**
     * Saleor event that triggers the webhook (here - ORDER_CREATED)
     */
    event,
    /**
     * App's URL
     */
    baseUrl,
    /**
     * Auth data (from APL) - contains token and saleorApiUrl that can be used to construct graphQL client
     */
    authData,
  } = ctx;

  /**
   * Perform logic based on Saleor Event payload
   */
  console.log(`cod checking: ${payload}`);

  /**
   * Create GraphQL client to interact with Saleor API.
   */
  const client = createClient(authData.saleorApiUrl, async () => ({ token: authData.token }));
  
  /**
   * Now you can fetch additional data using urql.
   * https://formidable.com/open-source/urql/docs/api/core/#clientquery
   */
  
  // const data = await client.query().toPromise()

  /**
   * Inform Saleor that webhook was delivered properly.
   */
    return res.json({ data: {"check": "ok cod"} })
});

/**
 * Disable body parser for this endpoint, so signature can be verified
 */
export const config = {
  api: {
    bodyParser: false,
  },
};
