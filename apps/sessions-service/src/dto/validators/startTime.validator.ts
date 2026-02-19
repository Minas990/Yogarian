import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'isNotBeforeCurrentDate', async: false })
export class IsNotBeforeCurrentDate implements ValidatorConstraintInterface {
    validate(value: Date, args: ValidationArguments) {
        if(!value) return false; 
        const now = new Date();
        const hoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
        return value > hoursFromNow;
    }

    defaultMessage(args: ValidationArguments) {
        return 'Start time must be a future date and after a  hours from now.';
    }
}

export function ValidStartTime(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'ValidStartTime',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: IsNotBeforeCurrentDate,
        });
    };
}
