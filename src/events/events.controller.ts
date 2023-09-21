import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateEventDto } from './input/create-event.dto';
import { UpdateEventDto } from './input/update-event.dto';
import { Event } from './event.entity';
import { Like, MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Attendee } from './attendee.entity';
import { EventsService } from './events.service';
import { ListEvents } from './input/list.events';
import { CurrentUser } from './../auth/current-user.decorator';
import { User } from './../auth/user.entity';
import { AuthGuardJwt } from './../auth/auth-guard.jwt';

@Controller('/events')
@SerializeOptions({ strategy: 'excludeAll' })
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  constructor(
    // @InjectRepository(Event)
    // private readonly repository: Repository<Event>,
    private readonly eventsService: EventsService,
  ) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(ClassSerializerInterceptor)
  async findAll(@Query() filter: ListEvents) {
    const events =
      await this.eventsService.getEventsWithAttendeeCountFilteredPaginated(
        filter,
        {
          total: true,
          currentPage: filter.page,
          limit: 2,
        },
      );
    return events;
  }

  // @Get('/practice')
  // async practice() {
  //   const date = new Date();
  //   console.log(date.toISOString().toString());
  //   return await this.repository.find({
  //     select: ['id', 'when'],
  //     where: [
  //       {
  //         id: MoreThan(1),
  //         when: MoreThan(new Date(date.toISOString().toString())),
  //       },
  //       {
  //         description: Like('%meet%'),
  //       },
  //     ],
  //     take: 2,
  //     order: {
  //       id: 'DESC',
  //     },
  //   });
  // }

  // @Get('practice2')
  // async practice2() {
  //   // return await this.repository.findOne({
  //   //   where: {
  //   //     id: 1,
  //   //   },
  //   //   // loadEagerRelations: false,
  //   //   relations: ['attendees'],
  //   // });
  //   // const event = await this.repository.findOne({
  //   //   where: { id: 1 },
  //   //   relations: ['attendees'],
  //   // });
  //   // // const event = new Event();
  //   // // event.id = 1;
  //   // const attendee = new Attendee();
  //   // attendee.name = 'Using cascade 1';
  //   // // attendee.event = event;
  //   // event.attendees.push(attendee);
  //   // event.attendees = [];
  //   // // await this.attendeerepository.save(attendee);
  //   // await this.repository.save(event);
  //   // return event;

  //   return await this.repository
  //     .createQueryBuilder('e')
  //     .select(['e.id', 'e.name'])
  //     .orderBy('e.id', 'ASC')
  //     .take(3)
  //     .getMany();
  // }

  @Get(':id')
  @UseInterceptors(ClassSerializerInterceptor)
  async findOne(@Param('id', ParseIntPipe) id) {
    // console.log(typeof id);
    const event = await this.eventsService.getEventWithAttendeeCount(id);

    if (!event) {
      throw new NotFoundException();
    }

    return event;
  }

  @Post()
  @UseGuards(AuthGuardJwt)
  @UseInterceptors(ClassSerializerInterceptor)
  async create(@Body() input: CreateEventDto, @CurrentUser() user: User) {
    return await this.eventsService.createEvent(input, user);
  }

  @Patch(':id')
  @UseGuards(AuthGuardJwt)
  @UseInterceptors(ClassSerializerInterceptor)
  async update(
    @Param('id', ParseIntPipe) id,
    @Body() input: UpdateEventDto,
    @CurrentUser() user: User,
  ) {
    const event = await this.eventsService.findOne(id);

    if (!event) {
      throw new NotFoundException();
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException(
        null,
        `You are not authorized to change this event`,
      );
    }

    return await this.eventsService.updateEvent(event, input);
  }

  @HttpCode(204)
  @UseGuards(AuthGuardJwt)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id, @CurrentUser() user: User) {
    const event = await this.eventsService.findOne(id);

    if (!event) {
      throw new NotFoundException();
    }

    if (event.organizerId !== user.id) {
      throw new ForbiddenException(
        null,
        `You are not authorized to delete this event`,
      );
    }

    await this.eventsService.deleteEvent(id);
  }
}
