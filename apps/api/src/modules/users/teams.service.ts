import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Team } from './entities/team.entity';
import { User } from './entities/user.entity';

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    dto: { name: string; description?: string; leaderId?: string },
    tenantId: string,
  ): Promise<Team> {
    const team = this.teamRepository.create({
      ...dto,
      tenantId,
    });
    return this.teamRepository.save(team);
  }

  async findAll(tenantId: string): Promise<Team[]> {
    return this.teamRepository.find({
      where: { tenantId },
      relations: ['leader', 'members'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, tenantId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id, tenantId },
      relations: ['leader', 'members'],
    });

    if (!team) {
      throw new NotFoundException(`Team ${id} not found`);
    }

    return team;
  }

  async update(
    id: string,
    dto: { name?: string; description?: string; leaderId?: string },
    tenantId: string,
  ): Promise<Team> {
    const team = await this.findOne(id, tenantId);
    Object.assign(team, dto);
    return this.teamRepository.save(team);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const team = await this.findOne(id, tenantId);
    await this.teamRepository.remove(team);
  }

  async addMember(teamId: string, userId: string, tenantId: string): Promise<Team> {
    const team = await this.findOne(teamId, tenantId);
    const user = await this.userRepository.findOne({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const alreadyMember = team.members.some((m) => m.id === userId);
    if (alreadyMember) {
      return team;
    }

    team.members.push(user);
    return this.teamRepository.save(team);
  }

  async removeMember(teamId: string, userId: string, tenantId: string): Promise<Team> {
    const team = await this.findOne(teamId, tenantId);
    team.members = team.members.filter((m) => m.id !== userId);
    return this.teamRepository.save(team);
  }

  async getTeamMemberIds(teamId: string, tenantId: string): Promise<string[]> {
    const team = await this.findOne(teamId, tenantId);
    return team.members.map((m) => m.id);
  }
}
