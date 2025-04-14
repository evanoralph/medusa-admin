import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"

export default async function orderCompletedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {

  try {
    const logger = container.resolve("logger");
    const orderService = container.resolve("order");
    const productService = container.resolve("product");

    if (!data.id) {
      throw new Error("Order ID is required");
    }

    logger.info(`${JSON.stringify(data)}`); 

    const order = await orderService.retrieveOrder(data.id, {
      relations: ["items"],
    });

    logger.info(`${JSON.stringify(order)}`);

    order.items?.forEach(async (item) => {
      logger.info(`${JSON.stringify(item)}`);

      if (!item.variant_id) {
        throw new Error("Variant ID is required");
      }
      const productData = await productService.listProductVariants({
        id: item.variant_id,
      });

      const product = await productService.updateProductVariants(item.variant_id,{
        metadata: {
          ...productData[0].metadata,
          pledge_amount: productData[0].metadata?.pledge_amount ? Number(productData[0].metadata?.pledge_amount) + 1 : 1,
        },
      });

      logger.info(`${JSON.stringify(product)}`);

    });

   

  } catch (error) {
    const logger = container.resolve("logger");
    logger.error(`Error in orderCompletedHandler: ${error.message}`);
    // You can choose to re-throw the error if you want it to be handled by Medusa's error handling system
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
} 