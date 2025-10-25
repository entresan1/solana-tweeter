use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use std::mem;

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let tweet_account = next_account_info(accounts_iter)?;
    let author_account = next_account_info(accounts_iter)?;
    let system_program = next_account_info(accounts_iter)?;

    // Parse instruction data
    if instruction_data.len() < 2 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let instruction = u16::from_le_bytes([instruction_data[0], instruction_data[1]]);
    
    match instruction {
        0 => send_tweet(program_id, tweet_account, author_account, system_program, &instruction_data[2..])?,
        _ => return Err(ProgramError::InvalidInstructionData),
    }
    
    Ok(())
}

fn send_tweet(
    program_id: &Pubkey,
    tweet_account: &AccountInfo,
    author_account: &AccountInfo,
    system_program: &AccountInfo,
    instruction_data: &[u8],
) -> ProgramResult {
    // Parse topic and content from instruction data
    if instruction_data.len() < 8 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let topic_len = u32::from_le_bytes([instruction_data[0], instruction_data[1], instruction_data[2], instruction_data[3]]) as usize;
    let content_len = u32::from_le_bytes([instruction_data[4], instruction_data[5], instruction_data[6], instruction_data[7]]) as usize;
    
    if instruction_data.len() < 8 + topic_len + content_len {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    let topic = String::from_utf8(instruction_data[8..8 + topic_len].to_vec())
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    let content = String::from_utf8(instruction_data[8 + topic_len..8 + topic_len + content_len].to_vec())
        .map_err(|_| ProgramError::InvalidInstructionData)?;
    
    // Validate lengths
    if topic.len() > 50 {
        return Err(ProgramError::InvalidInstructionData);
    }
    if content.len() > 280 {
        return Err(ProgramError::InvalidInstructionData);
    }
    
    // Create tweet account
    let tweet_space = 8 + 32 + 8 + 4 + topic.len() + 4 + content.len(); // discriminator + author + timestamp + topic + content
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(tweet_space);
    
    solana_program::program::invoke(
        &system_instruction::create_account(
            author_account.key,
            tweet_account.key,
            lamports,
            tweet_space as u64,
            program_id,
        ),
        &[author_account.clone(), tweet_account.clone(), system_program.clone()],
    )?;
    
    // Initialize tweet data
    let mut tweet_data = tweet_account.try_borrow_mut_data()?;
    let mut offset = 0;
    
    // Write discriminator (8 bytes)
    tweet_data[offset..offset + 8].copy_from_slice(&[0u8; 8]);
    offset += 8;
    
    // Write author (32 bytes)
    tweet_data[offset..offset + 32].copy_from_slice(author_account.key.as_ref());
    offset += 32;
    
    // Write timestamp (8 bytes)
    let clock = solana_program::sysvar::clock::Clock::get()?;
    tweet_data[offset..offset + 8].copy_from_slice(&clock.unix_timestamp.to_le_bytes());
    offset += 8;
    
    // Write topic length and data
    tweet_data[offset..offset + 4].copy_from_slice(&(topic.len() as u32).to_le_bytes());
    offset += 4;
    tweet_data[offset..offset + topic.len()].copy_from_slice(topic.as_bytes());
    offset += topic.len();
    
    // Write content length and data
    tweet_data[offset..offset + 4].copy_from_slice(&(content.len() as u32).to_le_bytes());
    offset += 4;
    tweet_data[offset..offset + content.len()].copy_from_slice(content.as_bytes());
    
    Ok(())
}
