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
    const cartService = container.resolve("cart");
    const productService = container.resolve("product");

    //show the variant metadata
    const cart = await cartService.listLineItems({
      cart_id: data.id,
    });

    if (!cart || cart.length === 0) {
      throw new Error(`No cart items found for cart ID: ${data.id}`);
    }



    //get the latest cart item by created_at
    const latestCartItem = cart.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

    logger.info(`${JSON.stringify(latestCartItem)} --latestCartItem`);

    const product = await productService.listProductVariants({
      id: latestCartItem.variant_id,
      product_id: latestCartItem.product_id,
    });

    logger.info(`${JSON.stringify(product)} --latestCartItem`);


    const metadata = product[0].metadata;

    const pledge_amount = metadata?.pledge_amount || 0;
    const pledge_limit = metadata?.pledge_limit || 0;

    logger.info(`${pledge_amount} --pledge_amount`);
    logger.info(`${pledge_limit} --pledge_currency`);


    //modify the cart item if the pledge_amount is less than pledge_limit
    if (pledge_amount < pledge_limit && !metadata?.discount_amount) {
      //  productService.updateProductVariants(product[0].id, {
      //   metadata: {
      //     ...metadata,
      //     pledge_amount: pledge_amount ? Number(pledge_amount) + 1 : 1,
      //     pledge_limit: metadata?.pledge_limit,
      //   },
      //  });


      //modify the cart item unit_price
      await cartService.updateLineItems(latestCartItem.id, {
        unit_price: latestCartItem.unit_price - (latestCartItem.unit_price * 0.10),
        quantity: 1,
        metadata: {
          pledge_discount: true,
          discount_amount: latestCartItem.unit_price * 0.10,
        },
      });
    } else {
      await cartService.updateLineItems(latestCartItem.id, {
        quantity: 1,
        metadata: {
          pledge_discount: false,
        },
      });
    }


    //get the variant metadata

    // Process each cart item
    // const productPromises = cart.map(async (item) => {
    //   try {
    //     const product = await productService.listProducts({
    //       id: item.product_id,
    //     });

    //     if (!product || product.length === 0) {
    //       throw new Error(`Product not found for ID: ${item.product_id}`);
    //     }

    //     logger.info(`${JSON.stringify(product)}`);
    //     return product;
    //   } catch (error) {
    //     logger.error(`Error processing product ${item.product_id}: ${error.message}`);
    //     throw error; // Re-throw to be caught by outer try-catch
    //   }
    // });

    // await Promise.all(productPromises);

  } catch (error) {
    const logger = container.resolve("logger");
    logger.error(`Error in orderCompletedHandler: ${error.message}`);
    // You can choose to re-throw the error if you want it to be handled by Medusa's error handling system
    throw error;
  }
}

export const config: SubscriberConfig = {
  event: "cart.updated",
} 