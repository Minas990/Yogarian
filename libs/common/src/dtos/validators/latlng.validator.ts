import { registerDecorator, ValidationOptions, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'latLongPair', async: false })
export class LatLongPairConstraint implements ValidatorConstraintInterface {
    validate(value: any, args: ValidationArguments) {
        const obj = args.object as any;
        const hasLat = obj.latitude !== undefined && obj.latitude !== null;
        const hasLng = obj.longitude !== undefined && obj.longitude !== null;

        return (hasLat && hasLng) || (!hasLat && !hasLng);
    }

    defaultMessage(args: ValidationArguments) {
        return 'Both latitude and longitude must be provided together or not at all';
    }
}

export function LatLongPair(validationOptions?: ValidationOptions) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'latLongPair',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: LatLongPairConstraint,
        });
    };
}
