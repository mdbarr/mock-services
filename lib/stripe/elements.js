'use strict';

function Elements (mock) {
  const wallet = {
    link_available: {
      card_element: false,
      split_card_elements: false,
      payment_request_button: true,
      checkout: true,
    },
    link_settings: {
      merchant_info: {
        business_name: 'development',
        country: 'US',
      },
      customer_info: { country: 'US' },
      link_hcaptcha_site_key: '20000000-ffff-ffff-ffff-000000000002',
      link_hcaptcha_rqdata: 'l9Wjdw5EbCIOBNTMioWe6B2OhbW0bEA3NqZ1wyjQeAynWez9/THnvAiKhMHaaFWGBqx0rF6sGiFb4WinGnHsFu9nrIarrX7hWaXEtk24609PhxJsd13r9smtSk2arCZrxXg58pGH22VoBQZ5oDH6cthypmH359yHuNx3K3tUdULEmXCNYT/LP4lQzowi1yk+oBbYvUHNq1vjS0g3toqzkLVLIcLVuM3DpyB173imvdoD56dftDl9JReVkYa/NF/FIbEaTcL6KSpPrya3Kg==+3wKzvo5LyGex+CE',
      link_purchase_protections_data: {
        is_eligible: false,
        type: null,
      },
      link_ncdv_selectors: null,
      link_funding_sources: [ 'CARD' ],
      link_disabled_reasons: {
        card_element: [
          'link_not_enabled_on_payment_config',
          'not_in_card_cohort',
        ],
        split_card_elements: [
          'link_not_enabled_on_payment_config',
          'not_in_split_card_cohort',
        ],
      },
    },
    google_pay_available: { payment_request_button: true },
    apple_pay_available: {
      payment_request_button: false,
      token_notification_url: 'https://pm-hooks.stripe.com/apple_pay/merchant_token/pDq7tf9uieoQWMVJixFwuOve/acct_18TstuGx7r9RMMUs/',
    },
    apple_pay_later_available: { payment_request_button: false },
    passive_captcha: { site_key: '20000000-ffff-ffff-ffff-000000000002' },
    card_brand_choice: {
      eligible: false,
      preferred_networks: [ 'cartes_bancaires' ],
      supported_cobranded_networks: { cartes_bancaires: true },
    },
    capability_enabled_card_networks: [ 'cartes_bancaires' ],
    is_connect_platform: null,
    flags: {
      enable_email_otp_for_link_popup: true,
      enable_webauthn_for_link_popup: true,
      enable_prefill_data_collection: true,
      enable_ncdv_recall: false,
      enable_ncdv_usage: false,
      link_disable_email_otp: false,
      elements_enable_passive_captcha: true,
      elements_enable_passive_hcaptcha_in_payment_method_creation: true,
      elements_display_prb_warning: false,
      in_link_in_split_card_elements_ga_cohort: false,
      in_incoming_link_in_split_card_elements_cohort: false,
      disable_cbc_in_card_element: false,
      disable_cbc_in_link_popup: false,
      cbc_in_link_popup: true,
      enable_link_in_split_card_blur_focus_events: false,
      link_purchase_protections_enabled: false,
      wallet_config_enable_cb_apple_pay_for_connect_platforms: true,
      ce_prb_enable_link_global_holdback_lookup: true,
    },
    gates: {
      elements_display_prb_warning: false,
      is_testmode_preview: false,
    },
    verified_payment_methods_on_domain: {
      google_pay: true,
      apple_pay: false,
      link: true,
    },
    experiments: {
      experiment_assignments: {
        enable_link_in_card_element_combined: 'control',
        enable_link_in_card_element_combined_two: 'treatment',
        enable_link_in_card_element_combined_three: 'treatment',
        enable_link_in_card_element_combined_four: 'control',
        two_button_payment_request_button: 'control',
        two_button_payment_request_button_aa: 'control',
        link_global_holdback_aa: 'control',
      },
      arb_id: '3035bdb3-5262-4f3e-99fd-afb1a8d6fa73',
      elements_session_id: null,
      elements_assignment_id: null,
    },
  };

  mock.api.get('/stripe/elements/wallet-config', async (req, res) => {
    res.send(200, wallet);
  });

  mock.api.post('/stripe/elements/wallet-config', async (req, res) => {
    res.send(200, wallet);
  });
}

module.exports = (mock, stripe) => new Elements(mock, stripe);
