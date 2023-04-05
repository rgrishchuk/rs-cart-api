import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { v4 } from 'uuid';

import { User } from '../models';

@Injectable()
export class UsersService {
  private pool: Pool;
  private readonly users: Record<string, User>;

  constructor() {
    this.users = {};
    this.pool = new Pool({
      host: process.env.DATABASE_HOST,
      port: +process.env.DATABASE_PORT,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
    });
  }

  async findOne({ name, password }): Promise<User> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
          `SELECT * FROM users WHERE name = $1 LIMIT 1`,
          [name],
      );

      if (result.rows.length === 0 || result.rows[0].password !== password) {
        return null;
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async createOne({ name, password }: User): Promise<User> {
    const client = await this.pool.connect();
    try {
      const id = v4(v4());

      const query = `INSERT INTO users (id, name, password) VALUES ($1, $2, $3) RETURNING *`;
      const values = [id, name, password];
      const result = await client.query(query, values);
      return result.rows[0];
    } catch {
      return null;
    }
    finally {
      client.release();
    }
  }

}
