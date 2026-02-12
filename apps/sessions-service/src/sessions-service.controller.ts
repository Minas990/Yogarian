import { EmailConfirmedGuard, JwtAuthGuard, Roles, RolesDecorator } from '@app/common';
import { IsAllowedGuard } from '@app/common/auth/guards/is-allowed.guard';
import { KAFKA_TOPICS } from '@app/kafka';
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';

@Controller('sessions')
export class SessionsServiceController 
{
    constructor()
    {
        
    }
    @Get( )
    async getQuery(@Query() query )
    {
        return query;
    }
    @Get(':id')
    async getSessionById(@Param('id',ParseUUIDPipe) id: string)
    {
        return id;
    }

    @Get('user/:userId')//userID is the id of the trainer or the user who created the session
    async getSessionsByUserId(@Param('userId',ParseUUIDPipe) userId: string)
    {
        return userId;
    }

    @RolesDecorator(Roles.TRAINER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    @Post()
    async createSession(createSessionDto: any)
    {

    }

    @RolesDecorator(Roles.TRAINER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    @Patch(':id')
    async updateSession(@Param('id',ParseUUIDPipe) id: string, updateSessionDto: any)
    {

    }

    @RolesDecorator(Roles.TRAINER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    @Delete(':id')
    async deleteSession(@Param('id',ParseUUIDPipe) id: string)
    {

    }

    @RolesDecorator(Roles.USER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    async getNearestSessions(@Body() locationDto: any)
    {

    }

    @RolesDecorator(Roles.USER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    @Post(':id/review') // the id for the session
    async submitReview(@Param('id',ParseUUIDPipe) id: string, reviewDto: any)
    {

    }
    @RolesDecorator(Roles.USER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    @Delete(':id/review') // the id for the session
    async deleteReview(@Param('id',ParseUUIDPipe) id: string)
    {

    }
    @RolesDecorator(Roles.USER)
    @UseGuards(JwtAuthGuard,EmailConfirmedGuard,IsAllowedGuard)
    @Patch(':id/review') // the id for the session
    async updateReview(@Param('id',ParseUUIDPipe) id: string, reviewDto: any)
    {

    }

    //this will get all the reviews of a session and will be accessible to everyone
    @Get(':id/review') // the id for the session
    async getReviews(@Param('id',ParseUUIDPipe) id: string,@Query() query: any)
    {

    }
    
    @EventPattern(KAFKA_TOPICS.USER_DELETED)
    async handleUserDeletedEvent(payload: any)
    {

    }

}
