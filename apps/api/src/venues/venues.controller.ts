import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { VenuesService } from './venues.service';
import { VenueType } from '@prisma/client';

@ApiTags('venues')
@Controller()
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  @Get('venues')
  @ApiOperation({ summary: 'List all venues with search and filter' })
  @ApiQuery({ name: 'type', enum: VenueType, required: false })
  @ApiQuery({ name: 'city', required: false })
  @ApiQuery({ name: 'query', required: false })
  async listVenues(
    @Query('type') type?: VenueType,
    @Query('city') city?: string,
    @Query('query') query?: string,
  ) {
    return this.venuesService.findAllVenues({ type, city, query });
  }

  @Get('venues/:slug')
  @ApiOperation({ summary: 'Get venue details by slug' })
  async getVenueBySlug(@Param('slug') slug: string) {
    return this.venuesService.findVenueBySlug(slug);
  }

  @Get('resources/:id')
  @ApiOperation({ summary: 'Get resource details by ID' })
  async getResource(@Param('id') id: string) {
    return this.venuesService.findResourceById(id);
  }

  @Get('resources/:id/availability')
  @ApiOperation({ summary: 'Get available time slots for a resource in date range' })
  @ApiQuery({ name: 'from', description: 'ISO UTC start date string (e.g. 2026-10-10T00:00:00Z)' })
  @ApiQuery({ name: 'to', description: 'ISO UTC end date string (e.g. 2026-10-17T23:59:59Z)' })
  async getAvailability(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Req() req: Request,
  ) {
    let currentUserId: string | undefined;

    // Optional auth extraction to identify HELD_BY_ME vs HELD_BY_OTHER
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        });
        currentUserId = payload.sub;
      } catch {
        // ignore invalid token for optional auth check
      }
    }

    const defaultFrom = from || new Date().toISOString();
    const defaultTo = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    return this.venuesService.getResourceAvailability(id, defaultFrom, defaultTo, currentUserId);
  }
}
