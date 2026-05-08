import { NextResponse } from 'next/server'

export async function GET() {
  // Hent membership instances og se om der er Bruce-typer
  const res = await fetch(
    `https://nrthrnstrong.marianatek.com/api/membership_instances?per_page=10&purchase_location=48718`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',
      }
    }
  )
  const data = await res.json()
  
  // Find alle unikke membership navne
  const names = [...new Set(data.data?.map((d: any) => d.attributes.membership_name))]
  
  // Hent også tags på en bruger for at se om Bruce er tagget
  const userRes = await fetch(
    `https://nrthrnstrong.marianatek.com/api/users?per_page=5&tag=bruce`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.MARIANA_TEK_API_KEY}`,
        'Content-Type': 'application/json',