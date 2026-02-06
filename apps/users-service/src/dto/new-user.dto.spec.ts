import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { NewUserDto } from "./new-user.dto";

describe("NewUserDto", () => {
  it("fails when nested DTOs are invalid", async () => {
    const dto = plainToInstance(NewUserDto, {
      createUserDto: {},
      photo: {},
    });

    const errors = await validate(dto);
    const props = errors.map((e) => e.property);

    expect(props).toEqual(expect.arrayContaining(["createUserDto", "photo"]));
    expect(errors.find((e) => e.property === "createUserDto")?.children?.length).toBeGreaterThan(0);
    expect(errors.find((e) => e.property === "photo")?.children?.length).toBeGreaterThan(0);
  });
});
