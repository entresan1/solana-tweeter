const crypto = require('crypto');

// Generate a new program ID
const programId = crypto.randomBytes(32);
const programIdBase58 = require('bs58').encode(programId);

console.log('New Program ID:', programIdBase58);

// Create a simple program that just returns success
const simpleProgram = `
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
    declare_id,
};

declare_id!("${programIdBase58}");

entrypoint!(process_instruction);

pub fn process_instruction(
    _program_id: &Pubkey,
    _accounts: &[AccountInfo],
    _instruction_data: &[u8],
) -> ProgramResult {
    Ok(())
}
`;

const fs = require('fs');
fs.writeFileSync('src/lib.rs', simpleProgram);
console.log('Created simple program with new ID');
