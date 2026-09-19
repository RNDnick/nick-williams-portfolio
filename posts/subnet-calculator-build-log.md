---
title: Building a subnet calculator in one evening with Claude Code
date: 2026-01-10
category: Build log
readTime: 5
excerpt: From idea to live tool, start to finish.
---

I'd been meaning to build something for years. Not a big something — just one of the dozen small tools I used to wish existed when I was running an IT support desk. The subnet calculator was the obvious place to start, because I could still do the maths in my head, which meant I'd know immediately if the tool was wrong.

## Why this one first

Every network engineer ends up with their own scrap of paper, spreadsheet, or half-remembered formula for working out host ranges and broadcast addresses from a CIDR block. I must have redone that calculation a thousand times over ten years, and there's no reason it should take longer than typing in an address.

It's also a self-contained problem. No accounts, no data to store, no edge cases that only show up in production. Input a network address and a prefix, get back the broadcast address, the usable host range, and the subnet mask. That made it a good first test of whether I could actually ship something with Claude Code in an evening, rather than a weekend.

## What actually took the time

The maths took about twenty minutes. Explaining, clearly, what I wanted the interface to look and feel like took much longer — which was a useful lesson for the tools that came after. Being specific about edge cases (a /31, a /32, an invalid mask) up front saved a lot of back-and-forth later.

By the end of the evening I had a working calculator, deployed and live. Nothing fancy, but correct, fast, and something I'd actually reach for over doing the maths by hand.

## What I'd do differently now

Looking back, I under-specified the design brief and over-specified the logic — which, given my background, is exactly the mistake I'd expect to make. The next few tools flipped that balance, and it showed.
