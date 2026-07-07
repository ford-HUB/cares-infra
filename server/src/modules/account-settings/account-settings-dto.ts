export interface ChangeEmailDto {
    current_password: string;
    new_email: string;
}

export interface ChangePasswordDto {
    current_password: string;
    new_password: string;
}

export interface ChangeEmailResponseDto {
    email: string;
    access_token: string;
}

export interface ChangePasswordResponseDto {
    message: string;
}
