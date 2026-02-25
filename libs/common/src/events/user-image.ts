export class UserImageProfile
{
    userId: string;
    url: string;

    constructor(userId: string, url: string)
    {
        this.userId = userId;
        this.url = url;
    }
}