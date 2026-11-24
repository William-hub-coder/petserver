import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { prisma, PetType } from '@petpal/db';
import { isPetTypeCode, type PetTypeCode } from '@petpal/shared';

type PetBody = {
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
};

function mapPet(p: {
  id: string;
  name: string;
  type: PetType;
  breed: string | null;
  gender: string | null;
  birthday: Date | null;
  weightKg: number | null;
  sterilized: boolean;
  vaccinated: boolean;
  avatarUrl: string | null;
  dietNote: string | null;
  habitatNote: string | null;
  specialNeeds: string | null;
  notes: string | null;
  adoptionSource: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: p.id,
    name: p.name,
    type: p.type,
    breed: p.breed,
    gender: p.gender,
    birthday: p.birthday?.toISOString().slice(0, 10) ?? null,
    weightKg: p.weightKg,
    sterilized: p.sterilized,
    vaccinated: p.vaccinated,
    avatarUrl: p.avatarUrl,
    dietNote: p.dietNote,
    habitatNote: p.habitatNote,
    specialNeeds: p.specialNeeds,
    notes: p.notes,
    adoptionSource: p.adoptionSource,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function resolveType(raw?: string | null): PetType {
  if (isPetTypeCode(raw)) return raw as PetType;
  return 'other';
}

@Injectable()
export class UserService {
  async me(userId: string) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        pets: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: '用户不存在' });
    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      privacyAcceptedAt: user.privacyAcceptedAt?.toISOString() ?? null,
      privacyVersion: user.privacyVersion,
      pets: user.pets.map(mapPet),
    };
  }

  async patchMe(userId: string, body: { nickname?: string; avatarUrl?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        nickname: body.nickname,
        avatarUrl: body.avatarUrl,
      },
    });
    return this.me(user.id);
  }

  async acceptPrivacy(userId: string, version?: string) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        privacyAcceptedAt: new Date(),
        privacyVersion: version || '2026.1',
      },
    });
    return this.me(userId);
  }

  async createPet(userId: string, body: PetBody): Promise<Record<string, unknown>> {
    if (!body.name?.trim()) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: '宠物昵称必填' });
    }
    const type = resolveType(body.type);
    const pet = await prisma.pet.create({
      data: {
        userId,
        name: body.name.trim(),
        type,
        breed: body.breed?.trim() || null,
        gender: body.gender?.trim() || null,
        birthday: body.birthday ? new Date(body.birthday) : null,
        weightKg: body.weightKg ?? null,
        sterilized: !!body.sterilized,
        vaccinated: !!body.vaccinated,
        dietNote: body.dietNote?.trim() || null,
        habitatNote: body.habitatNote?.trim() || null,
        specialNeeds: body.specialNeeds?.trim() || null,
        notes: body.notes?.trim() || null,
        adoptionSource: body.adoptionSource?.trim() || null,
        avatarUrl: body.avatarUrl?.trim() || null,
      },
    });
    return mapPet(pet);
  }

  async updatePet(
    userId: string,
    petId: string,
    body: PetBody,
  ): Promise<Record<string, unknown>> {
    const pet = await prisma.pet.findFirst({ where: { id: petId, deletedAt: null } });
    if (!pet) throw new NotFoundException({ code: 'NOT_FOUND', message: '宠物不存在' });
    if (pet.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权操作' });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        throw new BadRequestException({ code: 'BAD_REQUEST', message: '宠物昵称必填' });
      }
      data.name = body.name.trim();
    }
    if (body.type !== undefined) data.type = resolveType(body.type) as PetTypeCode;
    if (body.breed !== undefined) data.breed = body.breed?.trim() || null;
    if (body.gender !== undefined) data.gender = body.gender?.trim() || null;
    if (body.birthday !== undefined) {
      data.birthday = body.birthday ? new Date(body.birthday) : null;
    }
    if (body.weightKg !== undefined) data.weightKg = body.weightKg;
    if (body.sterilized !== undefined) data.sterilized = !!body.sterilized;
    if (body.vaccinated !== undefined) data.vaccinated = !!body.vaccinated;
    if (body.dietNote !== undefined) data.dietNote = body.dietNote?.trim() || null;
    if (body.habitatNote !== undefined) data.habitatNote = body.habitatNote?.trim() || null;
    if (body.specialNeeds !== undefined) data.specialNeeds = body.specialNeeds?.trim() || null;
    if (body.notes !== undefined) data.notes = body.notes?.trim() || null;
    if (body.adoptionSource !== undefined) {
      data.adoptionSource = body.adoptionSource?.trim() || null;
    }
    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl?.trim() || null;

    const updated = await prisma.pet.update({ where: { id: petId }, data });
    return mapPet(updated);
  }

  async deletePet(userId: string, petId: string) {
    const pet = await prisma.pet.findFirst({ where: { id: petId, deletedAt: null } });
    if (!pet) throw new NotFoundException({ code: 'NOT_FOUND', message: '宠物不存在' });
    if (pet.userId !== userId) throw new ForbiddenException({ code: 'FORBIDDEN', message: '无权操作' });
    await prisma.pet.update({ where: { id: petId }, data: { deletedAt: new Date() } });
    return { ok: true };
  }
}
