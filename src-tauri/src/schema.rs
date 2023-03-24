// @generated automatically by Diesel CLI.

diesel::table! {
    connections (id) {
        id -> Integer,
        name -> Text,
        host -> Text,
        port -> Integer,
        username -> Text,
        password -> Text,
        cluster -> Integer,
        nodes -> Text,
        security_type -> Integer,
        use_private_key -> Integer,
        ssh_username -> Text,
        ssh_host -> Text,
        ssh_port -> Integer,
        ssh_password -> Text,
        private_key_path -> Text,
        create_date -> Timestamp,
        update_date -> Timestamp,
    }
}

diesel::table! {
    setting (id) {
        id -> Integer,
        language -> Text,
        font_size -> Integer,
        theme -> Text,
        refresh_interval -> Integer,
        editor_font_size -> Integer,
    }
}

diesel::allow_tables_to_appear_in_same_query!(
    connections,
    setting,
);
