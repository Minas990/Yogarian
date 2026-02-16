import { Roles } from "@app/common";
import { AbstractEntity } from "@app/database/database.entity";
import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";


@Entity()
@Index('idx_auth_user_reset_token_valid', 
  ['passwordResetToken', 'passwordResetTokenExpiresAt'], 
  { where: `"passwordResetToken" IS NOT NULL` }
)
@Index('idx_auth_user_cleanup', ['isEmailConfirmed', 'createdAt'])
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
    
    @Column({nullable:true,type:'varchar',length:64})    
    passwordResetToken: string;
    @Column({nullable:true,type:'timestamp'})
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