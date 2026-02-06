import { Roles } from "@app/common";
import { AbstractEntity } from "@app/database/database.entity";
import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


@Entity()
export class AuthUser extends AbstractEntity<AuthUser>
{
    @Column({unique:true})
    email: string;
    @Column()
    password: string;
    @PrimaryGeneratedColumn('uuid')
    userId: string;
    @Column('boolean',{default:false})
    isEmailConfirmed: boolean;
    @Column({nullable:true})
    passwordChangedAt: Date;
    @Index()
    @Column({nullable:true})    
    passwordResetToken: string;
    @Column({nullable:true})
    passwordResetTokenExpiresAt: Date;

    @Column({nullable:true})
    otp:string;
    @UpdateDateColumn()
    updatedAt: Date;
    @Column({
        type:'enum',
        enum: Roles,
        default: Roles.USER
    })
    role: Roles;
    @Column({nullable:true})
    otpExpiresAt: Date;
    constructor(partial: Partial<AuthUser>)
    {
        super()
        Object.assign(this, partial);
    }
}