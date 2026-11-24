import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCode } from '@petpal/shared';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  private uid(header?: string) {
    if (!header) throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: '缺少用户身份' });
    return header;
  }

  @Get('me')
  async me(@Headers('x-user-id') userId?: string) {
    const data = await this.users.me(this.uid(userId));
    return { code: ErrorCode.OK, data };
  }

  @Patch('me')
  async patchMe(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { nickname?: string; avatarUrl?: string },
  ) {
    const data = await this.users.patchMe(this.uid(userId), body);
    return { code: ErrorCode.OK, data };
  }

  @Post('privacy/accept')
  async privacy(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { version?: string },
  ) {
    const data = await this.users.acceptPrivacy(this.uid(userId), body.version);
    return { code: ErrorCode.OK, data };
  }

  @Post('pets')
  async createPet(
    @Headers('x-user-id') userId: string | undefined,
    @Body()
    body: {
      name?: string;
      type?: string;
      breed?: string | null;
      gender?: string | null;
      birthday?: string | null;
      weightKg?: number | null;
      sterilized?: boolean;
      vaccinated?: boolean;
      dietNote?: string | null;
      habitatNote?: string | null;
      specialNeeds?: string | null;
      notes?: string | null;
      adoptionSource?: string | null;
      avatarUrl?: string | null;
    },
  ) {
    const data = await this.users.createPet(this.uid(userId), body);
    return { code: ErrorCode.OK, data };
  }

  @Patch('pets/:id')
  async updatePet(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      type?: string;
      breed?: string | null;
      gender?: string | null;
      birthday?: string | null;
      weightKg?: number | null;
      sterilized?: boolean;
      vaccinated?: boolean;
      dietNote?: string | null;
      habitatNote?: string | null;
      specialNeeds?: string | null;
      notes?: string | null;
      adoptionSource?: string | null;
      avatarUrl?: string | null;
    },
  ) {
    const data = await this.users.updatePet(this.uid(userId), id, body);
    return { code: ErrorCode.OK, data };
  }

  @Delete('pets/:id')
  async deletePet(@Headers('x-user-id') userId: string | undefined, @Param('id') id: string) {
    const data = await this.users.deletePet(this.uid(userId), id);
    return { code: ErrorCode.OK, data };
  }
}
