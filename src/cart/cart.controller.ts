import {
  Controller,
  Get,
  Delete,
  Put,
  Body,
  Req,
  Param,
  UseGuards,
  HttpStatus,
  UnauthorizedException
} from '@nestjs/common';

import { BasicAuthGuard, JwtAuthGuard } from '../auth';
import { OrderService } from '../order';
import { AppRequest, getUserIdFromRequest, isAdmin } from '../shared';

import { CartService } from './services';

@Controller('api/profile/cart')
export class CartController {
  constructor(
    private cartService: CartService,
    private orderService: OrderService
  ) { }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get()
  async findUserCart(@Req() req: AppRequest) {
    const cart = await this.cartService.findOrCreateByUserId(getUserIdFromRequest(req));

    return cart.items.filter(({ count }) => count);
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put()
  async updateUserCart(@Req() req: AppRequest, @Body() body) {
    const cart = await this.cartService.updateByUserId(getUserIdFromRequest(req), body)

    return cart.items.filter(({ count }) => count);
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Delete()
  async clearUserCart(@Req() req: AppRequest) {
    await this.cartService.removeByUserId(getUserIdFromRequest(req));

    return {
      statusCode: HttpStatus.OK,
      message: 'OK',
    }
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Put('order')
  async checkout(@Req() req: AppRequest, @Body() body) {
    const userId = getUserIdFromRequest(req);
    const cart = await this.cartService.findByUserId(userId);

    if (!(cart && cart.items.length)) {
      const statusCode = HttpStatus.BAD_REQUEST;
      req.statusCode = statusCode

      return {
        statusCode,
        message: 'Cart is empty',
      }
    }

    const { id: cartId, items } = cart;
    const { address, total } = body;
    const order = this.orderService.create({
      address,
      userId,
      cartId,
      total,
    });
    this.cartService.setOrdered(cartId);

    return {
      statusCode: HttpStatus.OK,
      message: 'OK',
      data: { order }
    }
  }

  // @UseGuards(JwtAuthGuard)
  @UseGuards(BasicAuthGuard)
  @Get('order')
  async getOrders(@Req() req: AppRequest, @Body() body) {
    if (!isAdmin(req)) {
      throw new UnauthorizedException();
    }
    const userId = getUserIdFromRequest(req);
    const orders = await this.orderService.findByUserId(userId);
    const items = await this.cartService.findByCartId(orders.map(({ cart_id }) => cart_id ));
    const res = orders.map(({ cart_id, id, delivery: { address, firstName, lastName }, comments, status }) => {
      const cartItems = items.filter(item => item.cart_id === cart_id).map(({ product_id, count }) =>
          ({ productId: product_id, count }));
      return {
        id, items: cartItems, address: { address, firstName, lastName, commment: comments }, statusHistory: [{ status }],
      };
    });

    return res;
  }

  @UseGuards(BasicAuthGuard)
  @Delete('order/:id')
  async deleteOrderById(@Req() req: AppRequest, @Param('id') id: string) {
    if (!isAdmin(req)) {
      throw new UnauthorizedException();
    }
    const userId = getUserIdFromRequest(req);
    const res = await this.orderService.deleteById(id, userId);

    return {
      statusCode: HttpStatus.OK,
      message: 'OK',
      res,
    };
  }

  @UseGuards(BasicAuthGuard)
  @Get('order/:id')
  async getOrderById(@Req() req: AppRequest, @Param('id') id: string) {
    if (!isAdmin(req)) {
      throw new UnauthorizedException();
    }
    const userId = getUserIdFromRequest(req);
    const res = await this.orderService.findById(id, userId);
    let items = [];

    if (res) {
      items = await this.cartService.findByCartId([res.cart_id]);
    }

    const { id: orderId, delivery: { address, firstName, lastName }, comments, status } = res;

    return res ? {
      id: orderId,
      items: items.map(({ product_id, count }) => ({ productId: product_id, count })),
      address: { address, firstName, lastName, commment: comments },
      statusHistory: [{ status }],
    } : null;
  }
}
