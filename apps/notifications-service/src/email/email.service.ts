import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { readFile } from "fs/promises";
import { join } from "path";
import { AppLoggerService } from "@app/common";
@Injectable()
export class EmailService implements OnModuleInit
{
    private transporter: nodemailer.Transporter;
    constructor(
        private readonly configService: ConfigService,
        private readonly appLogger: AppLoggerService
    )
    {

    }
    onModuleInit() 
    {
        this.transporter = nodemailer.createTransport({
            host: this.configService.getOrThrow<string>("SMTP_HOST"),
            port: this.configService.getOrThrow<number>("SMTP_PORT"),
            secure: false
        });
    }

    private async sendEmail(to: string, subject: string, text: string, html: string, userId: string)
    {
        try
        {
            await this.transporter.sendMail({
                from: this.configService.getOrThrow<string>("EMAIL_FROM"),
                to,
                subject,
                text,
                html,
            });
            this.appLogger.logInfo({
                functionName: 'sendEmail',
                message: `Email sent to ${to} with subject "${subject}"`,
                userId: userId,
                additionalData: { recipient: to, subject }
            });
        }
        catch(err)
        {
            await this.appLogger.logError({
                functionName: 'sendEmail',
                problem: `Failed to send email to ${to}`,
                userId: userId,
                error: err,
                additionalData: { recipient: to, subject }
            });
            throw err;
        }
    }

    async sendEmailFromTemplate(to: string, subject: string, templateName: string, variables: Record<string, string>, userId: string)
    {
        try
        {
            const templatePath = join(__dirname, 'html', `${templateName}.html`);
            let htmlContent = await readFile(templatePath, 'utf-8');
            
            for (const [key, value] of Object.entries(variables))
            {
                const regex = new RegExp(`{{${key}}}`, 'g');
                htmlContent = htmlContent.replace(regex, value);
            }
            const textContent = htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            return await this.sendEmail(to, subject, textContent, htmlContent, userId);
        }
        catch(err)
        {
            await this.appLogger.logError({
                functionName: 'sendEmailFromTemplate',
                problem: `Failed to send email from template ${templateName}`,
                userId: userId,
                error: err,
                additionalData: { recipient: to, templateName, variables }
            });
            throw err;
        }
    }
}