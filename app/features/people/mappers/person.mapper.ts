import { PersonDto } from "../dto/person.dto";
import { Person } from "../models/person.model";

export class PersonMapper {
  static toDomain(dto: PersonDto): Person {
    return {
      id: dto.id,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      firstName: dto.firstName,
      lastName: dto.lastName,
      birthday: dto.birthday,
      phone: dto.phone,
      address: dto.address,
    };
  }
}
