pub fn one_to_one_key(user1: &str, user2: &str) -> String {
    let mut ids = vec![user1, user2];
    ids.sort();
    ids.join("_")
}