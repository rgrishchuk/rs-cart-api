import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

import { v4 } from 'uuid';

import { Order } from '../models';
import {Cart} from "../../cart";

@Injectable()
export class OrderService {
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

  async findById(orderId: string, userId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
          `SELECT * FROM orders WHERE id = $1 AND user_id = $2`,
          [orderId, userId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async findByUserId(userId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
          `SELECT * FROM orders WHERE user_id = $1`,
          [userId],
      );

      if (result.rows.length === 0) {
        return [];
      }
      return result.rows;
    } finally {
      client.release();
    }
  }

  async create({ userId, cartId, address, total }: any) {
    const client = await this.pool.connect();

    try {
      const id = v4(v4());
      const { comment, ...delivery } = address;
      const query = `INSERT INTO orders (id, user_id, cart_id, delivery, comments, status, total, payment) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`;
      const values = [id, userId, cartId, JSON.stringify(delivery), comment, 'inProgress', total, JSON.stringify('Card')];
      const result = await client.query(query, values);
      return result;
    } finally {
      client.release();
    }
  }

  async deleteById(orderId: string, userId: string): Promise<any> {
    const client = await this.pool.connect();
    console.log(orderId, userId);
    try {
      const query = 'DELETE FROM orders WHERE id = $1 AND user_id = $2';
      const values = [orderId, userId];
      await client.query(query, values);
    } finally {
      client.release();
    }
  }
}
