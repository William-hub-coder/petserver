import { Injectable } from '@nestjs/common';
import { prisma } from '@petpal/db';

export type TrackSubject = 'delivery' | 'home_visit';
export type TrackRole = 'courier' | 'provider' | 'pet_anchor';

@Injectable()
export class LocationTrackService {
  async append(input: {
    subjectType: TrackSubject;
    subjectId: string;
    role: TrackRole;
    lat: number;
    lng: number;
    source?: string;
    heading?: number;
    speed?: number;
  }) {
    return prisma.locationTrack.create({
      data: {
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        role: input.role,
        lat: input.lat,
        lng: input.lng,
        source: input.source || 'mock',
        heading: input.heading,
        speed: input.speed,
      },
    });
  }

  async list(subjectType: TrackSubject, subjectId: string, limit = 200) {
    const rows = await prisma.locationTrack.findMany({
      where: { subjectType, subjectId },
      orderBy: { recordedAt: 'asc' },
      take: limit,
    });
    return rows.map((r) => ({
      id: r.id,
      role: r.role,
      lat: r.lat,
      lng: r.lng,
      source: r.source,
      recordedAt: r.recordedAt.toISOString(),
    }));
  }

  async latest(subjectType: TrackSubject, subjectId: string, role?: TrackRole) {
    const row = await prisma.locationTrack.findFirst({
      where: { subjectType, subjectId, ...(role ? { role } : {}) },
      orderBy: { recordedAt: 'desc' },
    });
    if (!row) return null;
    return {
      id: row.id,
      role: row.role,
      lat: row.lat,
      lng: row.lng,
      source: row.source,
      recordedAt: row.recordedAt.toISOString(),
    };
  }
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function mockEnabled() {
  return (process.env.LOCATION_TRACK_MOCK || 'true').toLowerCase() !== 'false';
}
