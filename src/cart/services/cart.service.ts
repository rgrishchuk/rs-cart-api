import { Injectable } from '@nestjs/common';
import { Cart } from '../models/index';
import { CartItem } from '../models/index';
import { Pool } from 'pg';

import { v4 } from 'uuid';

@Injectable()
export class CartService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: +process.env.DATABASE_PORT,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
  }

  async findByCartId(cartIds: string[]): Promise<any> {
    const client = await this.pool.connect();
    try {
      const itemsResult = await client.query(
          `SELECT * FROM cart_items WHERE cart_id = ANY($1)`,
          [cartIds],
      );

      if (itemsResult.rows.length === 0) {
        return [];
      }

      return itemsResult.rows;

    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string): Promise<Cart | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
          `SELECT * FROM carts WHERE user_id = $1 AND status <> 'ORDERED' LIMIT 1`,
          [userId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const cart = {
        id: result.rows[0].id,
        user_id: result.rows[0].user_id,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        status: result.rows[0].status,
        items: [],
      };

      const itemsResult = await client.query(
          `SELECT * FROM cart_items WHERE cart_id = $1`,
          [cart.id],
      );

      cart.items = itemsResult.rows.map(
          (row) => ({ product: { id: row.product_id }, count: row.count }),
      );

      return cart;
    } finally {
      client.release();
    }
  }

  async createByUserId(userId: string) {
    const id = v4();
    const createdAt = new Date();
    const updatedAt = createdAt;
    const status = 'OPEN';

    const client = await this.pool.connect();
    try {
      const query = `INSERT INTO carts (id, user_id, created_at, updated_at, status) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
      const values = [id, userId, createdAt, updatedAt, status];
      const result = await client.query(query, values);
      const newCart = {
        id: result.rows[0].id,
        user_id: result.rows[0].user_id,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
        status: result.rows[0].status,
        items: [],
      };
      return newCart;
    } finally {
      client.release();
    }
  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId);

    if (userCart) {
      return userCart;
    }

    return this.createByUserId(userId);
  }

  async updateByUserId(userId: string, { product, count }: CartItem): Promise<Cart> {
    const client = await this.pool.connect();
    try {
      let cart = await this.findByUserId(userId);

      if (!cart) {
        cart = await this.createByUserId(userId);
      }

      const itemResult = await client.query(
          `SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2`,
          [cart.id, product.id],
      );

      if (itemResult.rows.length > 0) {
        if (count) {
          await client.query(
              `UPDATE cart_items SET count = $1 WHERE cart_id = $2 AND product_id = $3`,
              [count, cart.id, product.id],
          );
        } else {
          await client.query(
              'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
              [cart.id, product.id],
          );
        }
      } else {
        await client.query(
            `INSERT INTO cart_items (cart_id, product_id, count) VALUES ($1, $2, $3)`,
            [cart.id, product.id, count],
        );
      }

      cart = await this.findByUserId(userId);

      return cart;
    } finally {
      client.release();
    }
  }

  async removeByUserId(userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const cartResult = await client.query(`SELECT * FROM carts WHERE user_id = $1`, [userId]);

      if (cartResult.rows.length === 0) {
        return;
      }
      const cartId = cartResult.rows[0].id;
      await client.query('DELETE FROM carts WHERE id = $1', [cartId]);
    } finally {
      client.release();
    }
  }

  async setOrdered(cartId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
          `UPDATE carts SET status = $1 WHERE id = $2`,
          ['ORDERED', cartId],
      );
    } finally {
      client.release();
    }
  }
}
