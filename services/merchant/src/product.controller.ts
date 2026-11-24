import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { ProductService } from './product.service';
import { CartService } from './cart.service';
import { ShopOrderService } from './shop-order.service';

@Controller()
export class ProductController {
  constructor(
    private readonly products: ProductService,
    private readonly cart: CartService,
    private readonly shopOrders: ShopOrderService,
  ) {}

  @Get('products/categories')
  categories() {
    return { code: ErrorCode.OK, data: this.products.categories() };
  }

  @Get('products')
  async list(
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('sort') sort?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    const data = await this.products.list({ category, keyword, sort, merchantId });
    return { code: ErrorCode.OK, data };
  }

  @Get('products/:id')
  async detail(@Param('id') id: string) {
    const data = await this.products.detail(id);
    return { code: ErrorCode.OK, data };
  }

  @Get('cart')
  async cartList(@Headers('x-user-id') userId?: string) {
    const data = await this.cart.list(userId);
    return { code: ErrorCode.OK, data };
  }

  @Post('cart')
  async cartAdd(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { productId?: string; qty?: number },
  ) {
    const data = await this.cart.add(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Patch('cart/:productId')
  async cartUpdate(
    @Headers('x-user-id') userId: string | undefined,
    @Param('productId') productId: string,
    @Body() body: { qty?: number },
  ) {
    const data = await this.cart.update(userId, productId, Number(body.qty ?? 0));
    return { code: ErrorCode.OK, data };
  }

  @Delete('cart')
  async cartClear(@Headers('x-user-id') userId?: string) {
    const data = await this.cart.clear(userId);
    return { code: ErrorCode.OK, data };
  }

  @Post('shop-orders/checkout')
  async checkout(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: {
      items?: Array<{ productId: string; qty: number }>;
      fromCart?: boolean;
      address?: string;
      remark?: string;
      payNow?: boolean;
    },
  ) {
    const data = await this.shopOrders.checkout(userId, body);
    return { code: ErrorCode.OK, data };
  }

  @Get('shop-orders')
  async orders(@Headers('x-user-id') userId?: string) {
    const data = await this.shopOrders.list(userId);
    return { code: ErrorCode.OK, data };
  }

  @Get('shop-orders/:id')
  async orderDetail(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    const data = await this.shopOrders.get(userId, id);
    return { code: ErrorCode.OK, data };
  }

  @Post('shop-orders/:id/pay')
  async pay(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    const data = await this.shopOrders.pay(userId, id);
    return { code: ErrorCode.OK, data };
  }
}
