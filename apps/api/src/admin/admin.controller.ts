import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { CreateVenueInput, CreateResourceInput, createVenueSchema, createResourceSchema } from '@slotlive/shared';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('bookings')
  @ApiOperation({ summary: 'Get all bookings for admin management' })
  async getBookings() {
    return this.adminService.getAllBookings();
  }

  @Post('bookings/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually cancel a booking as Admin' })
  async cancelBooking(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.adminService.manualCancelBooking(id, user.userId);
  }

  @Post('venues')
  @ApiOperation({ summary: 'Create new venue' })
  async createVenue(@Body() body: CreateVenueInput) {
    const validated = createVenueSchema.parse(body);
    return this.adminService.createVenue(validated);
  }

  @Post('resources')
  @ApiOperation({ summary: 'Create new resource' })
  async createResource(@Body() body: CreateResourceInput) {
    const validated = createResourceSchema.parse(body);
    return this.adminService.createResource(validated);
  }

  @Get('export-csv')
  @ApiOperation({ summary: 'Export all bookings as CSV' })
  async exportCsv(@Res() res: Response) {
    const csvContent = await this.adminService.exportBookingsCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="reservations-slotlive.csv"');
    return res.status(200).send(csvContent);
  }
}
