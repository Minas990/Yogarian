import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'ValidCursor', async: false })
export class ValidCursorConstraint implements ValidatorConstraintInterface {
    validate(value: string, args: ValidationArguments) {
        if(value.length === 0) return true; //allow empty cursor
        const parts = value.split('__');
        if (parts.length !== 2) {
            return false;
        }
        const [datePart, uuidPart] = parts;
        const date = new Date(datePart);
        if (isNaN(date.getTime())) {
            return false;
        }
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(uuidPart)) {
            return false;
        }
        return true;
    }

    defaultMessage(args: ValidationArguments) {
        return 'Cursor must be in the format: <ISO8601 date>__<UUIDv4>';
    }
}

export function IsCursorFormat(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'isCursorFormat',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: ValidCursorConstraint,
        });
    };
}
