# Interview demonstration scenarios

Start at `dist/index.html` in Chrome and click **Find My Casino**. The assistant uses the ten reference operators, with supporting Spanish-domain evidence only.

## 1. Preferences change the original order

Click **PayPal & quick processing**.

Expected shortlist: **bwin, Casino777, Platincasino** for this frozen evidence dataset. This differs from the original ranking. Open **Why this match?** and **Evidence**. Explain that processing and settlement are separate and there is no guaranteed payout time.

## 2. Simple bonus terms change the recommendation

Click **Simple bonus conditions**.

Expected first option: **PlayUZU**, supported by its published no-wagering policy and verified Visa method. It was #6 in the source page. Individual promotion eligibility and other conditions are still not established. Ask “Why did you recommend PlayUZU?” and then “Use PayPal instead.” PayPal cannot be inferred for PlayUZU, so the shortlist changes.

## 3. Published limits matter more than headline speed

Click **Published withdrawal limits**.

Expected shortlist: **LeoVegas only** for a €15,000 bank-transfer amount, using its published €20 minimum / €50,000 method maximum. The limit period is not specified. Timing is slower; show the trade-off. This does not verify that a particular account can make that withdrawal.

Try “I’m in Spain and want to withdraw €15,000 with PayPal.” Expected: no verified match. Unknown limits at other operators do not establish support; LeoVegas's published PayPal maximum is €10,000.

## 4. An honest no-match result

Click **Unsupported jurisdiction**.

Expected: no recommendations for the United Kingdom. The dataset establishes Spanish-domain evidence only. Keep country truthful; the prototype does not provide ways to bypass eligibility rules.

## 5. Essential question and evidence limits

Clear the country selector and submit “I prefer PayPal and clear conditions.” The assistant asks the country follow-up before shortlisting.

“I’m in Spain and need my withdrawal within 24 hours.” returns no match because the evidence does not establish a guaranteed end-to-end maximum.

“I’m in Spain and need no KYC.” returns no match because verification-free withdrawals are not evidenced.

Under-18 or chasing-loss requests do not receive casino recommendations.

## 6. Complete the comparison journey

Select **Compare** to view up to three options side by side. Explain the unknown fields and primary-source links. Use **View listing** to return to the unchanged original ranking and see its card highlighted. **Visit Casino · Demo** is a local confirmation only.

Close the assistant and open **Demo analytics**. Show the eight event types and JSON export. Explain that production FTD measurement needs partner attribution; this demonstration does not track real deposits.
