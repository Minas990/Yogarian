import { validate } from "class-validator";
import { CreateUserProfileDto } from "./create-user.dto";

describe("CreateUserProfileDto", () => {
  it("fails when required fields are missing", async () => {
    const dto = new CreateUserProfileDto();
    const errors = await validate(dto);

    const props = errors.map((e) => e.property);
    expect(props).toEqual(expect.arrayContaining(["email", "name", "userId"]));
  });

  it("passes with valid data", async () => {
    const dto = new CreateUserProfileDto();
    dto.email = "user@example.com";
    dto.name = "User Name";
    dto.userId = "2f0b7a36-3f7a-4a06-9c5d-7f0e2c2a9f4b";

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
